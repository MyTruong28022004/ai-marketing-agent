import { forwardRef } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = forwardRef(({ className = '', children, ...props }, ref) => (
  <SelectPrimitive.Trigger ref={ref} className={`radix-select-trigger ${className}`} {...props}>
    {children}
    <SelectPrimitive.Icon asChild><ChevronDown size={16}/></SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectContent = forwardRef(({ className = '', children, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content ref={ref} className={`radix-select-content ${className}`} position="popper" sideOffset={5} {...props}>
      <SelectPrimitive.ScrollUpButton className="radix-select-scroll-button"><ChevronUp size={14}/></SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport className="radix-select-viewport">{children}</SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="radix-select-scroll-button"><ChevronDown size={14}/></SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = forwardRef(({ className = '', ...props }, ref) => (
  <SelectPrimitive.Label ref={ref} className={`radix-select-label ${className}`} {...props}/>
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = forwardRef(({ className = '', children, ...props }, ref) => (
  <SelectPrimitive.Item ref={ref} className={`radix-select-item ${className}`} {...props}>
    <span className="radix-select-item-indicator"><SelectPrimitive.ItemIndicator><Check size={14}/></SelectPrimitive.ItemIndicator></span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = forwardRef(({ className = '', ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={`radix-select-separator ${className}`} {...props}/>
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue }
